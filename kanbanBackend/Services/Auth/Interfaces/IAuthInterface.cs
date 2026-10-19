using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IAuthInterface
{
    Task<RegistrationResponse> RegisterUser(RegisterRequest request);
    Task<CredentialResponse?> Login(LoginRequest request);

    Task<ModelResult<AuthResponse>> RegisterExternalUser(
        string googleUserId, string email, string? firstName, string? lastName,
        string? profilePicture, ExternalLoginProvider provider);

    Task<ModelResult<AuthResponse>> AuthenticatedUserResponse(int userId);
    Task<ModelResult<string>> ParseVerifiedGitHubEmail(string accessToken);
    Task<ModelResult<AuthResponse>> ConfirmMicrosoftLinkAsync(string token);
    Task<ModelResult<MicrosoftLoginResult>> RegisterMicrosoftUserAsync(string microsoftUserId,
        string? firstName, string? lastName, string? email,
        string? profilePicture);
}