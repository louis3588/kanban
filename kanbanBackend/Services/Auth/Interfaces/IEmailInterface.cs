using kanbanBackend.DTOs.Profile;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IEmailInterface
{
    Task SendEmailConfirmationAsync(string email, string url, string firstName);
    Task<ModelResult<bool>> PasswordReset(string email);

    Task<ModelResult<UserProfileResponse>> UpdatePassword(int userId, string password);
}