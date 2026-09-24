using kanbanBackend.Controllers;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Services.Auth.Interfaces;

namespace kanbanBackend.Tests.Services;

using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

public class AuthControllerTests
{
    [Fact]
    public async Task Register_ReturnsOk_WhenRegistrationSucceeds()
    {

        var authService = new Mock<IAuthInterface>();

        var request = new RegisterRequest
        {
            Username = "testuser",
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!"
        };

        var expectedResponse = new RegistrationResponse
        {
            UserId = 1,
            Email = request.Email,
            Message = "Registration successful"
        };

        authService
            .Setup(x => x.RegisterUser(request))
            .ReturnsAsync(expectedResponse);

        var controller = new AuthController(authService.Object);
        
        var result = await controller.Register(request);
        
        var okResult = Assert.IsType<OkObjectResult>(result.Result);

        Assert.Equal(expectedResponse, okResult.Value);

        authService.Verify(
            x => x.RegisterUser(request),
            Times.Once);
    }

    [Fact]
    public async Task Register_ReturnsConflict_WhenUsernameAlreadyExists()
    {
        var authService = new Mock<IAuthInterface>();

        var request = new RegisterRequest
        {
            Username = "existinguser",
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!"
        };

        authService
            .Setup(x => x.RegisterUser(request))
            .ThrowsAsync(
                new InvalidOperationException(
                    "Username is already in use."));

        var controller = new AuthController(authService.Object);

        var result = await controller.Register(request);
        
        var conflictResult = Assert.IsType<ConflictObjectResult>(result.Result);

        Assert.NotNull(conflictResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsOk_WhenCredentialsAreValid()
    {
        var authService = new Mock<IAuthInterface>();

        var request = new LoginRequest
        {
            Username = "testuser",
            Password = "Password123!"
        };

        var expectedResponse = new AuthResponse
        {
            UserId = 1,
            Username = "testuser",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            Token = "fake-jwt-token"
        };

        authService
            .Setup(x => x.Login(request))
            .ReturnsAsync(expectedResponse);

        var controller = new AuthController(authService.Object);

        var result = await controller.Login(request);
        
        var okResult = Assert.IsType<OkObjectResult>(result.Result);

        Assert.Equal(expectedResponse, okResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenCredentialsAreInvalid()
    {
        var authService = new Mock<IAuthInterface>();

        var request = new LoginRequest
        {
            Username = "testuser",
            Password = "wrongpassword"
        };

        authService
            .Setup(x => x.Login(request))
            .ReturnsAsync((CredentialResponse?)null);

        var controller = new AuthController(authService.Object);
        
        var result = await controller.Login(request);
        
        var unauthorizedResult =
            Assert.IsType<UnauthorizedObjectResult>(result.Result);

        Assert.NotNull(unauthorizedResult.Value);
    }
}