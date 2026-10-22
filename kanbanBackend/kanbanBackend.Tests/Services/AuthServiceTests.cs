using kanbanBackend.Controllers;
using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

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
        var googleService = new Mock<IGoogleTicketInterface>();

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

        var controller = new AuthController(authService.Object, googleService.Object);
        
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
        var googleService = new Mock<IGoogleTicketInterface>();

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

        var controller = new AuthController(authService.Object, googleService.Object);

        var result = await controller.Register(request);
        
        var conflictResult = Assert.IsType<ConflictObjectResult>(result.Result);

        Assert.NotNull(conflictResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsOk_WhenCredentialsAreValid()
    {
        var authService = new Mock<IAuthInterface>();
        var googleService = new Mock<IGoogleTicketInterface>();

        var request = new LoginRequest
        {
            Identifier = "testuser",
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

        var controller = new AuthController(authService.Object, googleService.Object);

        var result = await controller.Login(request);
        
        var okResult = Assert.IsType<OkObjectResult>(result.Result);

        Assert.Equal(expectedResponse, okResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenCredentialsAreInvalid()
    {
        var authService = new Mock<IAuthInterface>();
        var googleService = new Mock<IGoogleTicketInterface>();

        var request = new LoginRequest
        {
            Identifier = "testuser",
            Password = "wrongpassword"
        };

        authService
            .Setup(x => x.Login(request))
            .ReturnsAsync((CredentialResponse?)null);

        var controller = new AuthController(authService.Object, googleService.Object);
        
        var result = await controller.Login(request);
        
        var unauthorizedResult =
            Assert.IsType<UnauthorizedObjectResult>(result.Result);

        Assert.NotNull(unauthorizedResult.Value);
    }
    
    
[Fact]
public async Task Login_ReturnsAuthResponse_WhenCredentialsAreValidAndEmailIsVerified()
{
    var (service, context, passwordHasher, jwtService) = CreateAuthService();

    var user = new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = true
    };

    context.Users.Add(user);
    await context.SaveChangesAsync();

    passwordHasher
        .Setup(x => x.VerifyHashedPassword(
            user,
            user.PasswordHash,
            "Password123!"))
        .Returns(PasswordVerificationResult.Success);

    jwtService
        .Setup(x => x.GenerateToken(user))
        .Returns("fake-jwt-token");

    var request = new LoginRequest
    {
        Identifier = "johnsmith",
        Password = "Password123!"
    };

    var result = await service.Login(request);

    var response = Assert.IsType<AuthResponse>(result);
    Assert.Equal(user.Id, response.UserId);
    Assert.Equal("johnsmith", response.Username);
    Assert.Equal("john.smith@example.com", response.Email);
    Assert.Equal("fake-jwt-token", response.Token);

    jwtService.Verify(
        x => x.GenerateToken(user),
        Times.Once);
}

[Fact]
public async Task Login_ReturnsNull_WhenUserDoesNotExist()
{
    var (service, context, passwordHasher, jwtService) = CreateAuthService();

    var request = new LoginRequest
    {
        Identifier = "johnsmith",
        Password = "Password123!"
    };

    var result = await service.Login(request);

    Assert.Null(result);

    passwordHasher.Verify(
        x => x.VerifyHashedPassword(
            It.IsAny<User>(),
            It.IsAny<string>(),
            It.IsAny<string>()),
        Times.Never);

    jwtService.Verify(
        x => x.GenerateToken(It.IsAny<User>()),
        Times.Never);
}

[Fact]
public async Task Login_ReturnsNull_WhenPasswordIsIncorrect()
{
    var (service, context, passwordHasher, jwtService) = CreateAuthService();

    var user = new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = true
    };

    context.Users.Add(user);
    await context.SaveChangesAsync();

    passwordHasher
        .Setup(x => x.VerifyHashedPassword(
            user,
            user.PasswordHash,
            "WrongPassword123!"))
        .Returns(PasswordVerificationResult.Failed);

    var request = new LoginRequest
    {
        Identifier = "johnsmith",
        Password = "WrongPassword123!"
    };

    var result = await service.Login(request);

    Assert.Null(result);

    jwtService.Verify(
        x => x.GenerateToken(It.IsAny<User>()),
        Times.Never);
}

[Fact]
public async Task Login_ReturnsNull_WhenEmailIsNotVerified()
{
    var (service, context, passwordHasher, jwtService) = CreateAuthService();

    var user = new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = false
    };

    context.Users.Add(user);
    await context.SaveChangesAsync();

    passwordHasher
        .Setup(x => x.VerifyHashedPassword(
            user,
            user.PasswordHash,
            "Password123!"))
        .Returns(PasswordVerificationResult.Success);

    var request = new LoginRequest
    {
        Identifier = "johnsmith",
        Password = "Password123!"
    };

    var result = await service.Login(request);

    Assert.Null(result);

    jwtService.Verify(
        x => x.GenerateToken(It.IsAny<User>()),
        Times.Never);
}

[Fact]
public async Task AuthenticatedUserResponse_ReturnsSuccess_WhenUserExists()
{
    var (service, context, _, jwtService) = CreateAuthService();

    var user = new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = true
    };

    context.Users.Add(user);
    await context.SaveChangesAsync();

    jwtService
        .Setup(x => x.GenerateToken(user))
        .Returns("fake-jwt-token");

    var result = await service.AuthenticatedUserResponse(user.Id);

    Assert.True(result.IsSuccess);
    Assert.NotNull(result.Value);
    Assert.Equal(user.Id, result.Value.UserId);
    Assert.Equal("johnsmith", result.Value.Username);
    Assert.Equal("john.smith@example.com", result.Value.Email);
    Assert.Equal("fake-jwt-token", result.Value.Token);

    jwtService.Verify(
        x => x.GenerateToken(user),
        Times.Once);
}

[Fact]
public async Task AuthenticatedUserResponse_ReturnsFailure_WhenUserDoesNotExist()
{
    var (service, _, _, jwtService) = CreateAuthService();

    var result = await service.AuthenticatedUserResponse(999);

    Assert.False(result.IsSuccess);
    Assert.Equal("User not found", result.ErrorMessage);

    jwtService.Verify(
        x => x.GenerateToken(It.IsAny<User>()),
        Times.Never);
}

[Fact]
public async Task RegisterUser_ThrowsInvalidOperationException_WhenUsernameAlreadyExists()
{
    var (service, context, _, _) = CreateAuthService();

    context.Users.Add(new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = true
    });

    await context.SaveChangesAsync();

    var request = new RegisterRequest
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "another.email@example.com",
        Password = "Password123!"
    };

    var exception = await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.RegisterUser(request));

    Assert.Equal("Username is already in use.", exception.Message);
}

[Fact]
public async Task RegisterUser_ThrowsInvalidOperationException_WhenEmailAlreadyExists()
{
    var (service, context, _, _) = CreateAuthService();

    context.Users.Add(new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = true
    });

    await context.SaveChangesAsync();

    var request = new RegisterRequest
    {
        Username = "johnsmith2",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        Password = "Password123!"
    };

    var exception = await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.RegisterUser(request));

    Assert.Equal("Email is already in use.", exception.Message);
}

private static (
    AuthService Service,
    KanbanDbContext Context,
    Mock<IPasswordHasher<User>> PasswordHasher,
    Mock<IJwtInterface> JwtService
) CreateAuthService()
{
    var options = new DbContextOptionsBuilder<KanbanDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options;

    var context = new KanbanDbContext(options);

    var passwordHasher = new Mock<IPasswordHasher<User>>();
    var jwtService = new Mock<IJwtInterface>();
    var emailService = new Mock<IEmailInterface>();
    var emailConfirmationService = new Mock<IEmailConfirmationInterface>();
    var httpClientFactory = new Mock<IHttpClientFactory>();

    var dataProtectionProvider = new EphemeralDataProtectionProvider();

    var service = new AuthService(
        context,
        passwordHasher.Object,
        jwtService.Object,
        emailService.Object,
        emailConfirmationService.Object,
        httpClientFactory.Object,
        dataProtectionProvider);

    return (service, context, passwordHasher, jwtService);
}

}