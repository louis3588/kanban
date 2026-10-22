using kanbanBackend.Controllers;
using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Services;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Tests.Services;

using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

public class EmailServiceTests
{
    [Fact]
    public async Task Confirm_ReturnsOk_WhenEmailConfirmationSucceeds()
    {

        var confirmationService = new Mock<IEmailConfirmationInterface>();
        var jwtService = new Mock<IJwtInterface>();
        var emailService = new Mock<IEmailInterface>();

        var user = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User"
        };

        confirmationService
            .Setup(x => x.ConfirmEmailAsync(1, "valid-token"))
            .ReturnsAsync(ModelResult<User>.Success(user));

        jwtService
            .Setup(x => x.GenerateToken(user))
            .Returns("fake-jwt-token");

        var controller = new EmailController(
            confirmationService.Object,
            jwtService.Object,
            emailService.Object);

        var result = await controller.Confirm(1, "valid-token");
        var okResult = Assert.IsType<OkObjectResult>(result.Result);

        var response = Assert.IsType<AuthResponse>(okResult.Value);

        Assert.Equal(1, response.UserId);
        Assert.Equal("testuser", response.Username);
        Assert.Equal("test@example.com", response.Email);
        Assert.Equal("fake-jwt-token", response.Token);

        confirmationService.Verify(
            x => x.ConfirmEmailAsync(1, "valid-token"),
            Times.Once);

        jwtService.Verify(
            x => x.GenerateToken(user),
            Times.Once);
    }

    [Fact]
    public async Task Confirm_ReturnsBadRequest_WhenConfirmationFails()
    {

        var confirmationService = new Mock<IEmailConfirmationInterface>();
        var jwtService = new Mock<IJwtInterface>();
        var emailService = new Mock<IEmailInterface>();

        confirmationService
            .Setup(x => x.ConfirmEmailAsync(1, "invalid-token"))
            .ReturnsAsync(
                ModelResult<User>.Failure("Token has expired"));

        var controller = new EmailController(
            confirmationService.Object,
            jwtService.Object,
            emailService.Object);
        
        var result = await controller.Confirm(1, "invalid-token");
        
        var badRequestResult =
            Assert.IsType<BadRequestObjectResult>(result.Result);

        Assert.NotNull(badRequestResult.Value);

        jwtService.Verify(
            x => x.GenerateToken(It.IsAny<User>()),
            Times.Never);
    }
    
    
[Fact]
public async Task UpdatePassword_ReturnsFailure_WhenUserDoesNotExist()
{
    var (service, context, _) = CreateEmailService();

    var result = await service.UpdatePassword(999, "Password123!");

    Assert.False(result.IsSuccess);
    Assert.Equal("User not found", result.ErrorMessage);
}

[Fact]
public async Task UpdatePassword_ReturnsFailure_WhenEmailIsNotVerified()
{
    var (service, context, _) = CreateEmailService();

    context.Users.Add(new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "old-hash",
        IsEmailVerified = false
    });

    await context.SaveChangesAsync();

    var user = await context.Users.SingleAsync();

    var result = await service.UpdatePassword(user.Id, "Password123!");

    Assert.False(result.IsSuccess);
    Assert.Equal("Email not verified", result.ErrorMessage);
    Assert.Equal("old-hash", user.PasswordHash);
}

[Fact]
public async Task UpdatePassword_UpdatesPasswordAndClearsConfirmationToken_WhenUserIsVerified()
{
    var (service, context, passwordHasher) = CreateEmailService();

    var user = new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "old-hash",
        IsEmailVerified = true,
        EmailConfirmationTokenHash = "old-token",
        EmailConfirmationTokenExpiration = DateTime.UtcNow.AddMinutes(30)
    };

    context.Users.Add(user);
    await context.SaveChangesAsync();

    passwordHasher
        .Setup(x => x.HashPassword(user, "Password123!"))
        .Returns("new-hash");

    var result = await service.UpdatePassword(user.Id, "Password123!");

    Assert.True(result.IsSuccess);
    Assert.NotNull(result.Value);
    Assert.Equal(user.Id, result.Value.UserId);
    Assert.Equal("johnsmith", result.Value.Username);
    Assert.Equal("john.smith@example.com", result.Value.Email);

    var updatedUser = await context.Users.SingleAsync();

    Assert.Equal("new-hash", updatedUser.PasswordHash);
    Assert.Null(updatedUser.EmailConfirmationTokenHash);
    Assert.Null(updatedUser.EmailConfirmationTokenExpiration);

    passwordHasher.Verify(
        x => x.HashPassword(user, "Password123!"),
        Times.Once);
}

[Fact]
public async Task PasswordReset_ReturnsFailure_WhenEmailDoesNotExist()
{
    var (service, context, _) = CreateEmailService();

    var result = await service.PasswordReset("john.smith@example.com");

    Assert.False(result.IsSuccess);
    Assert.Equal("Email not found", result.ErrorMessage);
}

[Fact]
public async Task PasswordReset_ReturnsFailure_WhenEmailIsNotVerified()
{
    var (service, context, _) = CreateEmailService();

    context.Users.Add(new User
    {
        Username = "johnsmith",
        FirstName = "John",
        LastName = "Smith",
        Email = "john.smith@example.com",
        PasswordHash = "hashed-password",
        IsEmailVerified = false
    });

    await context.SaveChangesAsync();

    var result = await service.PasswordReset("john.smith@example.com");

    Assert.False(result.IsSuccess);
    Assert.Equal("Email not verified", result.ErrorMessage);
}

private static (
    EmailService Service,
    KanbanDbContext Context,
    Mock<IPasswordHasher<User>> PasswordHasher
) CreateEmailService()
{
    var options = new DbContextOptionsBuilder<KanbanDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options;

    var context = new KanbanDbContext(options);

    var passwordHasher = new Mock<IPasswordHasher<User>>();
    var emailTemplateUtil = new Mock<IEmailTemplateUtil>();

    var originalEmail = Environment.GetEnvironmentVariable("EMAILADDRESS");
    var originalPassword = Environment.GetEnvironmentVariable("EMAILAPPPASSWORD");

    EmailService service;

    try
    {
        Environment.SetEnvironmentVariable(
            "EMAILADDRESS",
            "test@example.com");

        Environment.SetEnvironmentVariable(
            "EMAILAPPPASSWORD",
            "test-app-password");

        service = new EmailService(
            context,
            passwordHasher.Object,
            emailTemplateUtil.Object);
    }
    finally
    {
        Environment.SetEnvironmentVariable("EMAILADDRESS", originalEmail);
        Environment.SetEnvironmentVariable("EMAILAPPPASSWORD", originalPassword);
    }

    return (service, context, passwordHasher);
}

}