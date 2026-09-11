
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using kanbanBackend.Models;
using kanbanBackend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace kanbanBackend.Tests.Services;

public class TokenServiceTests
{
    private const string TestSecret =
        "test-secret-key-that-is-at-least-32-characters-long";

    private static JwtService CreateJwtService()
    {
        Environment.SetEnvironmentVariable("JWT_SECRET", TestSecret);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "kanbanBackend",
                ["Jwt:Audience"] = "kanbanFrontend",
                ["Jwt:ExpiryMinutes"] = "60"
            })
            .Build();

        return new JwtService(configuration);
    }

    [Fact]
    public void GenerateToken_ReturnsValidToken()
    {
        var jwtService = CreateJwtService();

        var user = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com"
        };
        
        var token = jwtService.GenerateToken(user);
        
        Assert.NotNull(token);
        Assert.NotEmpty(token);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal("kanbanBackend", jwt.Issuer);
        Assert.Contains("kanbanFrontend", jwt.Audiences);

        Assert.Equal(
            "1",
            jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);

        Assert.Equal(
            "testuser",
            jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.UniqueName).Value);

        Assert.Equal(
            "test@example.com",
            jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);

        Assert.True(jwt.ValidTo > DateTime.UtcNow);
    }

    [Fact]
    public void GenerateToken_HasValidSignature()
    {
        var jwtService = CreateJwtService();

        var user = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com"
        };

        var token = jwtService.GenerateToken(user);

        var tokenHandler = new JwtSecurityTokenHandler
        {
            MapInboundClaims = false
        };

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = "kanbanBackend",
            ValidAudience = "kanbanFrontend",

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(TestSecret)),

            ClockSkew = TimeSpan.Zero,
            
        };

        var principal = tokenHandler.ValidateToken(
            token,
            validationParameters,
            out _);

        Assert.NotNull(principal);
        Assert.True(principal.Identity?.IsAuthenticated);

        Assert.Equal(
            "1",
            principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value);

        Assert.Equal(
            "testuser",
            principal.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value);
    }
}
