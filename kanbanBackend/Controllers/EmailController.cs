using kanbanBackend.DTOs.Auth;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Services.Auth.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace kanbanBackend.Controllers;

[ApiController]
[Route("api/email-confirmation")]
public class EmailController : ControllerBase
{
    private readonly IEmailConfirmationInterface _confirmationInterface;
    private readonly IJwtInterface _jwtInterface;
    private readonly IEmailInterface _emailInterface;



    public EmailController(IEmailConfirmationInterface confirmationInterface, IJwtInterface jwtInterface, IEmailInterface emailInterface)
    {
        _confirmationInterface = confirmationInterface;
        _jwtInterface = jwtInterface;
        _emailInterface = emailInterface;
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<UserProfileResponse>> ResetPassword(int user, string password)
    {
        var response = await _emailInterface.UpdatePassword(user, password);
        if (!response.IsSuccess)
        {
            return BadRequest(new
            {
                message = response.ErrorMessage
            });
        }
        return Ok(response.Value!);
    }
    
    [HttpPost("password-reset")]
    public async Task<ActionResult<bool>> SendPasswordResetEmail(string email)
    {
        await _emailInterface.PasswordReset(email);
        return Ok(true);
    }

    [HttpPost("confirm")]
    public async Task<ActionResult<AuthResponse>> Confirm(int userId, string token)
    {
        var response = await _confirmationInterface.ConfirmEmailAsync(userId, token);
        if (!response.IsSuccess)
        {
            return BadRequest(new
            {
                message = response.ErrorMessage
            });
        }

        var user = response.Value!;
        return Ok(new AuthResponse
        {
            Token = _jwtInterface.GenerateToken(user),
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
        });
    }
}