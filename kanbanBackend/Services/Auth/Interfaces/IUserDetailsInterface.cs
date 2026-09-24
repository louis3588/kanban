using kanbanBackend.Models;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IUserDetailsInterface
{
    Task<ModelResult<User>> EditProfile(int userId, string firstName = "",
        string profileImage = "", string lastName = "", string bio = "");
}