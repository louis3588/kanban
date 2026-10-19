using kanbanBackend.Data;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth;

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
            currentUser
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

        var currentUser = CreateCurrentUserService(null);

        var service = new UserDetailsService(
            context,
            currentUser
        );

        var result = await service.GetProfile(999);

        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.ErrorMessage);
    }

    [Fact]
    public async Task EditProfile_ReturnsFailure_WhenUserIsNotAuthenticated()
    {
        await using var context = CreateContext();

        var currentUser = CreateCurrentUserService(null);

        var service = new UserDetailsService(
            context,
            currentUser
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

        var currentUser = CreateCurrentUserService(999);

        var service = new UserDetailsService(
            context,
            currentUser
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
            currentUser
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
            currentUser
        );

        var result = await service.EditProfile(
            firstName: "Updated",
            bio: "Updated bio"
        );

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);

        // Supplied fields were updated
        Assert.Equal("Updated", result.Value.FirstName);
        Assert.Equal("Updated bio", result.Value.Bio);

        // Fields that were not supplied remain unchanged
        Assert.Equal("Polly", result.Value.LastName);
        Assert.Equal("original.jpg", result.Value.ProfileImage);

        // Other profile information is returned
        Assert.Equal(1, result.Value.UserId);
        Assert.Equal("louis", result.Value.Username);
        Assert.Equal("louis@example.com", result.Value.Email);

        // Confirm the changes were actually persisted
        var savedUser = await context.Users
            .FirstAsync(u => u.Id == 1);

        Assert.Equal("Updated", savedUser.FirstName);
        Assert.Equal("Updated bio", savedUser.Bio);
        Assert.Equal("Polly", savedUser.LastName);
        Assert.Equal("original.jpg", savedUser.ProfileImage);
    }
}