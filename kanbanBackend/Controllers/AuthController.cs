using kanbanBackend.DTOs.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace kanbanBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    
    private readonly IAuthInterface _authService;

    public AuthController(IAuthInterface authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse?>> Register(RegisterRequest registerRequest)
    {
        try
        {
            var response = await _authService.RegisterUser(registerRequest);
            return Ok(response);
        }
        catch (InvalidOperationException e)
        {
            return Conflict(new
            {
                message = e.Message
            });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<CredentialResponse?>> Login(LoginRequest loginRequest)
    {
        var response = await _authService.Login(loginRequest);
        if (response is null)
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }
        
        return Ok(response);
    }
    
}