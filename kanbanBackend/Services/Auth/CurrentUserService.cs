namespace kanbanBackend.Services.Auth;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

public class CurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    private ClaimsPrincipal? _hubPrincipal;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public void SetHubPrincipal(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            throw new UnauthorizedAccessException(
                "An authenticated user is required");
        }

        _hubPrincipal = principal;
    }

    private ClaimsPrincipal? Principal =>
        _hubPrincipal ?? _httpContextAccessor.HttpContext?.User;

    public int? UserId()
    {
        var principal = Principal;

        if (principal?.Identity?.IsAuthenticated != true)
        {
            return null;
        }
        
        var userIdClaim = principal.FindFirst(
                ClaimTypes.NameIdentifier) ?? principal.FindFirst(JwtRegisteredClaimNames.Sub);

        if (userIdClaim is null)
        {
            return null;
        }

        return int.TryParse(userIdClaim.Value, out var userId)
               && userId > 0 ? userId : null;
    }

    public string? Username
    {
        get
        {
            var principal = Principal;

            if (principal?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            return principal.FindFirst(
                       JwtRegisteredClaimNames.UniqueName)?.Value
                   ?? principal.FindFirst(ClaimTypes.Name)?.Value
                   ?? principal.Identity.Name;
        }
    }

    public string? Email
    {
        get
        {
            var principal = Principal;

            if (principal?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            return principal.FindFirst(
                       JwtRegisteredClaimNames.Email)?.Value
                   ?? principal.FindFirst(ClaimTypes.Email)?.Value;
        }
    }

    public bool IsAuthenticated =>
        Principal?.Identity?.IsAuthenticated == true;
}
