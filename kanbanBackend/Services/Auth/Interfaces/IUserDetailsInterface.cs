using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IUserDetailsInterface
{
    Task<ModelResult<UserProfileResponse>> EditUsername(string username, int userId);
    
    Task<ModelResult<UserProfileResponse>> GetProfile(int userId);
        
    Task<ModelResult<UserProfileResponse>> EditProfile(string? firstName = "", 
        string? profileImage = "", string? lastName = "", string? bio = "", int? userId = null);

    Task<ModelResult<UserPreferences>> GetPreferences(int userId);

    Task<ModelResult<UserPreferences>> EditSettings(AppTheme? appTheme = null, int? defaultBoardId = null,
            bool? showOnlineStatus = null, bool? enableEmailNotifications = null, int? userId = null);
}