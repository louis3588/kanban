using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Services;

using Microsoft.AspNetCore.Mvc;

namespace kanbanBackend.Controllers;

[ApiController]
[Route("api/email-confirmation")]
public class EmailController : ControllerBase
{
    private readonly EmailConfirmationService _confirmationService;
    private readonly JwtService _jwtService;


    public EmailController(EmailConfirmationService confirmationService, JwtService jwtService)
    {
        _confirmationService = confirmationService;
        _jwtService = jwtService;

    }

    
    public async Task<ActionResult<AuthResponse>> Confirm(int userId, string token)
    {
        var response = await _confirmationService.ConfirmEmailAsync(userId, token);
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
            Token = _jwtService.GenerateToken(user),
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
        });
    }
}