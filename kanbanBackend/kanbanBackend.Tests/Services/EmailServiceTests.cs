using kanbanBackend.Controllers;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;

namespace kanbanBackend.Tests.Services;

using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

public class EmailServiceTests
{
    [Fact]
    public async Task Confirm_ReturnsOk_WhenEmailConfirmationSucceeds()
    {

        var confirmationService =
            new Mock<IEmailConfirmationInterface>();

        var jwtService =
            new Mock<IJwtInterface>();

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
            jwtService.Object);

        // Act
        var result = await controller.Confirm(1, "valid-token");

        // Assert
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

        var confirmationService =
            new Mock<IEmailConfirmationInterface>();

        var jwtService =
            new Mock<IJwtInterface>();

        confirmationService
            .Setup(x => x.ConfirmEmailAsync(1, "invalid-token"))
            .ReturnsAsync(
                ModelResult<User>.Failure("Token has expired"));

        var controller = new EmailController(
            confirmationService.Object,
            jwtService.Object);
        
        var result = await controller.Confirm(1, "invalid-token");
        
        var badRequestResult =
            Assert.IsType<BadRequestObjectResult>(result.Result);

        Assert.NotNull(badRequestResult.Value);

        jwtService.Verify(
            x => x.GenerateToken(It.IsAny<User>()),
            Times.Never);
    }
}