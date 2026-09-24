using kanbanBackend.DTOs.Auth;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IAuthInterface
{
    Task<RegistrationResponse> RegisterUser(RegisterRequest request);
    Task<CredentialResponse?> Login(LoginRequest request);
}