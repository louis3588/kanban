namespace kanbanBackend.Tests.Services;

using System.IdentityModel.Tokens.Jwt;
using kanbanBackend.Models;
using kanbanBackend.Services;
using Microsoft.Extensions.Configuration;



public class TokenServiceTests
{
    [Fact]
    public void GenerateToken_ReturnsValidToken()
    {

        Environment.SetEnvironmentVariable(
            "JWT_SECRET",
            "test-secret-key-that-is-at-least-32-characters-long");

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "kanbanBackend",
                ["Jwt:Audience"] = "kanbanFrontend",
                ["Jwt:ExpiryMinutes"] = "60"
            })
            .Build();

        var jwtService = new JwtService(configuration);

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
}
