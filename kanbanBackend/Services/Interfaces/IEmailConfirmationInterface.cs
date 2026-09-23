using kanbanBackend.Models;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Interfaces;

public interface IEmailConfirmationInterface
{
    Task<string> GenerateEmailConfirmationTokenAsync(User user);
    Task<ModelResult<User>> ConfirmEmailAsync(int userId, string token);
}