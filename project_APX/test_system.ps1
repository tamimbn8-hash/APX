# =========================================================================
# APX┃Velro — Complete Automated System Test Suite
# =========================================================================

$baseUrl = "http://localhost:3000"
$allPassed = $true

function Assert-Test($condition, $testName) {
    if ($condition) {
        Write-Host "  ✅ PASS: $testName" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: $testName" -ForegroundColor Red
        $global:allPassed = $false
    }
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "STARTING APX VELRO SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan


# 1. Test Static Homepage & Guest Access
try {
    $res = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing
    Assert-Test ($res.StatusCode -eq 200) "Homepage loads with 200 OK"
} catch {
    Assert-Test $false "Homepage loads with 200 OK ($($_.Exception.Message))"
}

# 2. Test Guest Auth Status
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET
    Assert-Test ($res.success -eq $true -and $res.user -eq $null) "Guest /api/auth/me returns user: null"
} catch {
    Assert-Test $false "Guest /api/auth/me ($($_.Exception.Message))"
}

# 3. Test Unauthorized Access to /admin
try {
    $res = Invoke-WebRequest -Uri "$baseUrl/admin" -UseBasicParsing
    Assert-Test $false "/admin without auth should be blocked"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Assert-Test ($code -eq 403) "/admin without auth correctly returns 403 Forbidden"
}

# 4. Login as Regular Member (Ahmed)
$memberSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $body = @{ username = "Ahmed_Tester"; display_name = "Ahmed"; role = "Member" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/dev-login" -Method POST -Body $body -ContentType "application/json" -WebSession $memberSession
    Assert-Test ($res.success -eq $true -and $res.user.role -eq "Member" -and $res.user.member_days -ge 1) "Member (Ahmed) logged in successfully with real member_days"
} catch {
    Assert-Test $false "Member login ($($_.Exception.Message))"
}

# 5. Member trying to access Admin API (MUST BE BLOCKED)
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/overview" -Method GET -WebSession $memberSession
    Assert-Test $false "Member accessing /api/admin/overview should be blocked"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Assert-Test ($code -eq 403) "Member accessing /api/admin/overview correctly blocked with 403"
}

# 6. Member trying to change role (MUST BE BLOCKED)
try {
    $body = @{ role = "Admin" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/members/108108108108108108/role" -Method POST -Body $body -ContentType "application/json" -WebSession $memberSession
    Assert-Test $false "Member changing role should be blocked"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Assert-Test ($code -eq 403) "Member changing role correctly blocked with 403 Forbidden"
}

# 7. Login as Owner (08_1_)
$ownerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $body = @{ username = "08_1_"; display_name = "Tamim"; role = "Owner" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/dev-login" -Method POST -Body $body -ContentType "application/json" -WebSession $ownerSession
    Assert-Test ($res.success -eq $true -and $res.user.role -eq "Owner" -and $res.user.permissions -contains "change_roles") "Owner (08_1_) logged in with full Owner role and permissions"
} catch {
    Assert-Test $false "Owner login ($($_.Exception.Message))"
}

# 8. Owner accessing Admin Overview & Members
try {
    $overview = Invoke-RestMethod -Uri "$baseUrl/api/admin/overview" -Method GET -WebSession $ownerSession
    Assert-Test ($overview.success -eq $true -and $overview.stats.totalMembers -ge 2) "Owner /api/admin/overview returned real stats"

    $members = Invoke-RestMethod -Uri "$baseUrl/api/admin/members" -Method GET -WebSession $ownerSession
    Assert-Test ($members.success -eq $true -and $members.members.Count -ge 2) "Owner /api/admin/members listed registered members"
} catch {
    Assert-Test $false "Owner admin data access ($($_.Exception.Message))"
}

# 9. Owner promoting Ahmed to Moderator
try {
    $ahmed = ($members.members | Where-Object { $_.username -eq "Ahmed_Tester" })[0]
    $body = @{ role = "Moderator" } | ConvertTo-Json
    $roleRes = Invoke-RestMethod -Uri "$baseUrl/api/admin/members/$($ahmed.discord_id)/role" -Method POST -Body $body -ContentType "application/json" -WebSession $ownerSession
    Assert-Test ($roleRes.success -eq $true -and $roleRes.member.role -eq "Moderator") "Owner promoted Ahmed to Moderator"
} catch {
    Assert-Test $false "Owner role promotion ($($_.Exception.Message))"
}

# 10. Hierarchy Protection: Head Admin cannot promote above rank or edit Owner
$headAdminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $body = @{ username = "Kareem_Staff"; display_name = "Kareem"; role = "Head Admin" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/dev-login" -Method POST -Body $body -ContentType "application/json" -WebSession $headAdminSession

    # Try to edit Owner (MUST FAIL)
    $fail1 = $false
    try {
        $body = @{ role = "Member" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/api/admin/members/108108108108108108/role" -Method POST -Body $body -ContentType "application/json" -WebSession $headAdminSession
    } catch {
        $fail1 = $true
    }
    Assert-Test $fail1 "Hierarchy Security: Head Admin CANNOT modify Owner role"

    # Try to promote Ahmed to Founder (rank 80 > 60, MUST FAIL)
    $fail2 = $false
    try {
        $body = @{ role = "Founder" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/api/admin/members/$($ahmed.discord_id)/role" -Method POST -Body $body -ContentType "application/json" -WebSession $headAdminSession
    } catch {
        $fail2 = $true
    }
    Assert-Test $fail2 "Hierarchy Security: Head Admin CANNOT promote anyone to Founder (above self)"
} catch {
    Assert-Test $false "Hierarchy tests exception ($($_.Exception.Message))"
}

# 11. Member Mascot Widget Settings update
try {
    $body = @{ enabled = $true; position = "top-left"; pet_type = "neon_dragon"; sound = $true } | ConvertTo-Json
    $wRes = Invoke-RestMethod -Uri "$baseUrl/api/user/widget" -Method POST -Body $body -ContentType "application/json" -WebSession $ownerSession
    Assert-Test ($wRes.success -eq $true -and $wRes.widget_settings.position -eq "top-left") "Member Widget settings updated and persisted"
} catch {
    Assert-Test $false "Widget settings ($($_.Exception.Message))"
}

# 12. Verify Audit Activity Logs
try {
    $logs = Invoke-RestMethod -Uri "$baseUrl/api/admin/activity" -Method GET -WebSession $ownerSession
    Assert-Test ($logs.success -eq $true -and $logs.logs.Count -gt 0) "Audit logs recorded recent actions properly"
} catch {
    Assert-Test $false "Audit logs ($($_.Exception.Message))"
}

# 13. Verify Static Pages (Rules, Tutorials, Designs)
$pages = @("rules.html", "tutorials.html", "designs.html", "css/rules-modern.css", "css/admin.css")
foreach ($page in $pages) {
    try {
        $pRes = Invoke-WebRequest -Uri "$baseUrl/$page" -UseBasicParsing
        Assert-Test ($pRes.StatusCode -eq 200) "Static asset $page accessible with 200 OK"
    } catch {
        Assert-Test $false "Static asset $page ($($_.Exception.Message))"
    }
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "ALL TESTS PASSED SUCCESSFULLY! SYSTEM IS 100% HEALTHY!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED. CHECK LOGS ABOVE." -ForegroundColor Red
}
Write-Host "=======================================================" -ForegroundColor Cyan

