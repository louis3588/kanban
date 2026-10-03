using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IUserDetailsInterface
{
        Task<ModelResult<UserProfileResponse>> GetProfile(int userId);
        
        Task<ModelResult<UserProfileResponse>> EditProfile(string? firstName = "",
        string? profileImage = "", string? lastName = "", string? bio = "", int? userId = null);
}