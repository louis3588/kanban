using kanbanBackend.Data;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using Moq;

namespace kanbanBackend.Tests.Services;

using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Xunit;

public class UserDetailsServiceTests
{
    private static KanbanDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<KanbanDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new KanbanDbContext(options);
    }

    private static CurrentUserService CreateCurrentUserService(int? userId)
    {
        var httpContext = new DefaultHttpContext();

        if (userId.HasValue)
        {
            httpContext.User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    new[]
                    {
                        new Claim("sub", userId.Value.ToString())
                    },
                    "TestAuthentication"
                )
            );
        }

        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = httpContext
        };

        return new CurrentUserService(httpContextAccessor);
    }

    [Fact]
    public async Task GetProfile_ReturnsUserProfile_WhenUserExists()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        var user = new User
        {
            Username = "louis",
            FirstName = "Louis",
            LastName = "Polly",
            Email = "louis@example.com",
            Bio = "Original bio",
            ProfileImage = "original.jpg",
            IsEmailVerified = true
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var currentUser = CreateCurrentUserService(null);

        var service = new UserDetailsService(
            context,
            currentUser,
            confirmationService.Object
        );

        var result = await service.GetProfile(1);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        
        Assert.Equal("louis", result.Value!.Username);
        Assert.Equal("Louis", result.Value!.FirstName);
        Assert.Equal("Polly", result.Value!.LastName);
        Assert.Equal("louis@example.com", result.Value!.Email);
        Assert.Equal("Original bio", result.Value!.Bio);
        Assert.Equal("original.jpg", result.Value.ProfileImage);
    }

    [Fact]
    public async Task GetProfile_ReturnsFailure_WhenUserDoesNotExist()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        var currentUser = CreateCurrentUserService(null);

        var service = new UserDetailsService(
            context,
            currentUser,
            confirmationService.Object
        );

        var result = await service.GetProfile(999);

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }

    [Fact]
    public async Task EditProfile_ReturnsFailure_WhenUserIsNotAuthenticated()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        var currentUser = CreateCurrentUserService(null);

        var service = new UserDetailsService(
            context,
            currentUser,
            confirmationService.Object
        );

        var result = await service.EditProfile(
            firstName: "Updated"
        );

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }

    [Fact]
    public async Task EditProfile_ReturnsFailure_WhenUserDoesNotExist()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        var currentUser = CreateCurrentUserService(999);

        var service = new UserDetailsService(
            context,
            currentUser,
            confirmationService.Object
        );

        var result = await service.EditProfile(
            firstName: "Updated"
        );

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }

    [Fact]
    public async Task EditProfile_ReturnsFailure_WhenEmailIsNotVerified()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        var user = new User
        {
            Id = 1,
            Username = "louis",
            FirstName = "Louis",
            LastName = "Polly",
            Email = "louis@example.com",
            Bio = "Original bio",
            ProfileImage = "original.jpg",
            IsEmailVerified = false
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var currentUser = CreateCurrentUserService(1);

        var service = new UserDetailsService(
            context,
            currentUser,
            confirmationService.Object
        );

        var result = await service.EditProfile(
            firstName: "Updated"
        );

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "Cannot edit profile if not verified",
            result.ErrorMessage
        );
    }

    [Fact]
    public async Task EditProfile_UpdatesOnlyProvidedFields()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        var user = new User
        {
            Id = 1,
            Username = "louis",
            FirstName = "Louis",
            LastName = "Polly",
            Email = "louis@example.com",
            Bio = "Original bio",
            ProfileImage = "original.jpg",
            IsEmailVerified = true
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var currentUser = CreateCurrentUserService(1);

        var service = new UserDetailsService(
            context,
            currentUser,
            confirmationService.Object
        );

        var result = await service.EditProfile(
            firstName: "Updated",
            bio: "Updated bio"
        );

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("Updated", result.Value.FirstName);
        Assert.Equal("Updated bio", result.Value.Bio);
        Assert.Equal("Polly", result.Value.LastName);
        Assert.Equal("original.jpg", result.Value.ProfileImage);
        Assert.Equal(1, result.Value.UserId);
        Assert.Equal("louis", result.Value.Username);
        Assert.Equal("louis@example.com", result.Value.Email);
        
        var savedUser = await context.Users
            .FirstAsync(u => u.Id == 1);

        Assert.Equal("Updated", savedUser.FirstName);
        Assert.Equal("Updated bio", savedUser.Bio);
        Assert.Equal("Polly", savedUser.LastName);
        Assert.Equal("original.jpg", savedUser.ProfileImage);
    }
    
    [Fact]
    public async Task EditUsername_UpdatesUsername_WhenUserExists()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();
    
        var user = new User
        {
            Id = 1,
            Username = "louis",
            FirstName = "Louis",
            LastName = "Polly",
            Email = "louis@example.com",
            IsEmailVerified = true
        };
    
        context.Users.Add(user);
        await context.SaveChangesAsync();
    
        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );
    
        var result = await service.EditUsername("louis_polly", 1);
    
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("louis_polly", result.Value.Username);
        Assert.Equal("Louis", result.Value.FirstName);
    
        var savedUser = await context.Users.FirstAsync(u => u.Id == 1);
        Assert.Equal("louis_polly", savedUser.Username);
    }
    
    [Fact]
    public async Task EditUsername_ReturnsFailure_WhenUsernameIsAlreadyInUse()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();
    
        context.Users.AddRange(
            new User
            {
                Id = 1,
                Username = "louis",
                Email = "louis@example.com",
                IsEmailVerified = true
            },
            new User
            {
                Id = 2,
                Username = "taken",
                Email = "other@example.com",
                IsEmailVerified = true
            }
        );
    
        await context.SaveChangesAsync();
    
        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );
    
        var result = await service.EditUsername("taken", 1);
    
        Assert.False(result.IsSuccess);
        Assert.Equal("username is already in use", result.ErrorMessage);
    
        var savedUser = await context.Users.FirstAsync(u => u.Id == 1);
        Assert.Equal("louis", savedUser.Username);
    }
    
    [Fact]
    public async Task EditUsername_ReturnsFailure_WhenUserDoesNotExist()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();
    
        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );
    
        var result = await service.EditUsername("new_username", 999);
    
        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }
    
    [Fact]
    public async Task EditUsername_AllowsUserToKeepTheirExistingUsername()
    {
        await using var context = CreateContext();
        var confirmationService = new Mock<IEmailConfirmationInterface>();
    
        context.Users.Add(new User
        {
            Id = 1,
            Username = "louis",
            Email = "louis@example.com",
            IsEmailVerified = true
        });
    
        await context.SaveChangesAsync();
    
        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );
    
        var result = await service.EditUsername("louis", 1);
    
        Assert.True(result.IsSuccess);
        Assert.Equal("louis", result.Value!.Username);
    }
    
    private static Mock<IEmailConfirmationInterface>
        CreateConfirmationService(UserSettings? initialSettings = null)
    {
        var confirmationService = new Mock<IEmailConfirmationInterface>();

        if (initialSettings != null)
        {
            confirmationService
                .Setup(x => x.InitialiseUserSettings(It.IsAny<User>()))
                .ReturnsAsync(
                    ModelResult<UserSettings>.Success(initialSettings)
                );
        }

        return confirmationService;
    }
    
    [Fact]
    public async Task EditSettings_UpdatesProvidedSettings()
    {
        await using var context = CreateContext();
        var confirmationService = CreateConfirmationService();

        context.Users.Add(new User
        {
            Id = 1,
            Username = "louis",
            Email = "louis@example.com",
            IsEmailVerified = true
        });

        context.UserSettings.Add(new UserSettings
        {
            UserId = 1,
            Theme = AppTheme.SepiaLight,
            DefaultBoardId = null,
            ShowOnlineStatus = true,
            EnableEmailNotifications = true
        });

        await context.SaveChangesAsync();

        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );

        var result = await service.EditSettings(
            appTheme: AppTheme.Dark,
            showOnlineStatus: false,
            enableEmailNotifications: false,
            userId: 1
        );

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(AppTheme.Dark, result.Value.Theme);
        Assert.False(result.Value.ShowOnlineStatus);
        Assert.False(result.Value.EnableEmailNotifications);

        var savedSettings = await context.UserSettings
            .FirstAsync(s => s.UserId == 1);

        Assert.Equal(AppTheme.Dark, savedSettings.Theme);
        Assert.False(savedSettings.ShowOnlineStatus);
        Assert.False(savedSettings.EnableEmailNotifications);
    }

    [Fact]
    public async Task EditSettings_ReturnsFailure_WhenUserDoesNotExist()
    {
        await using var context = CreateContext();
        var confirmationService = CreateConfirmationService();

        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );

        var result = await service.EditSettings(userId: 999);

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }

    [Fact]
    public async Task EditSettings_ReturnsFailure_WhenUserIsNotAuthenticated()
    {
        await using var context = CreateContext();
        var confirmationService = CreateConfirmationService();

        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );

        var result = await service.EditSettings();

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }
    
    [Fact]
    public async Task GetPreferences_ReturnsPreferences_WhenUserAndSettingsExist()
    {
        await using var context = CreateContext();
        var confirmationService = CreateConfirmationService();

        context.Users.Add(new User
        {
            Id = 1,
            Username = "louis",
            FirstName = "Louis",
            LastName = "Polly",
            Email = "louis@example.com",
            Bio = "Original bio",
            ProfileImage = "original.jpg",
            IsEmailVerified = true
        });

        context.UserSettings.Add(new UserSettings
        {
            UserId = 1,
            Theme = AppTheme.SepiaLight,
            DefaultBoardId = null,
            ShowOnlineStatus = true,
            EnableEmailNotifications = false
        });

        await context.SaveChangesAsync();

        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );

        var result = await service.GetPreferences(1);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.NotNull(result.Value.Profile);

        Assert.Equal("louis", result.Value.Profile.Username);
        Assert.Equal("Louis", result.Value.Profile.FirstName);
        Assert.Equal("Polly", result.Value.Profile.LastName);
        Assert.Equal("louis@example.com", result.Value.Profile.Email);
        Assert.Equal("Original bio", result.Value.Profile.Bio);
        Assert.Equal("original.jpg", result.Value.Profile.ProfileImage);

        Assert.Equal(AppTheme.SepiaLight, result.Value.Theme);
        Assert.Null(result.Value.DefaultBoardId);
        Assert.True(result.Value.ShowOnlineStatus);
        Assert.False(result.Value.EnableEmailNotifications);

        confirmationService.Verify(
            x => x.InitialiseUserSettings(It.IsAny<User>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetPreferences_ReturnsFailure_WhenUserDoesNotExist()
    {
        await using var context = CreateContext();
        var confirmationService = CreateConfirmationService();

        var service = new UserDetailsService(
            context,
            CreateCurrentUserService(null),
            confirmationService.Object
        );

        var result = await service.GetPreferences(999);

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }
    
}