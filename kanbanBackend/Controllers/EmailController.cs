using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Services;
using kanbanBackend.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace kanbanBackend.Controllers;

[ApiController]
[Route("api/email-confirmation")]
public class EmailController : ControllerBase
{
    private readonly IEmailConfirmationInterface _confirmationInterface;
    private readonly IJwtInterface _jwtInterface;


    public EmailController(IEmailConfirmationInterface confirmationInterface, IJwtInterface jwtInterface)
    {
        _confirmationInterface = confirmationInterface;
        _jwtInterface = jwtInterface;
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

        User user = response.Value;
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