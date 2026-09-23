using kanbanBackend.DTOs.Auth;

namespace kanbanBackend.Services.Interfaces;

public interface IAuthInterface
{
    Task<RegistrationResponse> RegisterUser(RegisterRequest request);
    Task<CredentialResponse?> Login(LoginRequest request);
}