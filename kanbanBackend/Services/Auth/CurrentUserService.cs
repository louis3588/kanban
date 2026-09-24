using Microsoft.IdentityModel.JsonWebTokens;

namespace kanbanBackend.Services.Auth;

public class CurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? UserId()
    {
        var userIdClaim = _httpContextAccessor.HttpContext?
            .User
            .FindFirst(JwtRegisteredClaimNames.Sub);

        if (userIdClaim == null)
        {
            return null;
        }
        return int.TryParse(userIdClaim.Value, out var userId) ? userId : null;
    }

    public string? Username
    {
        get
        {
            return _httpContextAccessor.HttpContext?
                .User
                .FindFirst(JwtRegisteredClaimNames.UniqueName)?
                .Value;
        }
    }

    public string? Email
    {
        get
        {
            return _httpContextAccessor.HttpContext?
                .User
                .FindFirst(JwtRegisteredClaimNames.Email)?
                .Value;
        }
    }

    public bool IsAuthenticated
    {
        get
        {
            return _httpContextAccessor.HttpContext?
                .User?.Identity?.IsAuthenticated == true;
        }
    }
    
}