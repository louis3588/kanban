using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DotNetEnv;
using kanbanBackend.Data;
using kanbanBackend.Hubs;
using kanbanBackend.Models;
using kanbanBackend.Services;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Services.Dashboard;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Microsoft.IdentityModel.Validators;
using Microsoft.OpenApi.Models;

Env.Load();

var builder = WebApplication.CreateBuilder(args);
var jwtSecret = Environment.GetEnvironmentVariable("JWTSECRET");
var connectionString =
    $"Host={Environment.GetEnvironmentVariable("PGHOST")};" +
    $"Database={Environment.GetEnvironmentVariable("PGDATABASE")};" +
    $"Username={Environment.GetEnvironmentVariable("PGUSER")};" +
    $"Password={Environment.GetEnvironmentVariable("PGPASSWORD")};" +
    $"SSL Mode={Environment.GetEnvironmentVariable("PGSSLMODE")};" +
    $"Channel Binding={Environment.GetEnvironmentVariable("PGCHANNELBINDING")}";



if (string.IsNullOrEmpty(jwtSecret))
{
    throw new InvalidOperationException(
        "JWT_SECRET environment variable is not configured.");
}
builder.Services.AddDbContext<KanbanDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions
            .Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddScoped<IJwtInterface, JwtService>();
builder.Services.AddScoped<IAuthInterface, AuthService>();
builder.Services.AddScoped<IUserDetailsInterface, UserDetailsService>();
builder.Services.AddScoped<CurrentUserService>();
builder.Services.AddScoped<WorkspaceService>();
builder.Services.AddScoped<WorkspaceAuthService>();
builder.Services.AddScoped<IEmailInterface, EmailService>();
builder.Services.AddScoped<IEmailConfirmationInterface, EmailConfirmationService>();
builder.Services.AddSingleton<IEmailTemplateUtil, EmailTemplateUtil>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddHttpClient();
builder.Services.AddDataProtection();
builder.Services.AddScoped<IGoogleTicketInterface, GoogleLoginTicketService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:8081", "http://localhost:19006", "https://kanban-d6zv.onrender.com")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/board"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    })
    .AddCookie("GoogleExternal")
    .AddOpenIdConnect("Google", options =>
    {
        options.Authority = "https://accounts.google.com";
        options.ClientId = Environment.GetEnvironmentVariable("GOOGLEAUTHID");
        options.ClientSecret = Environment.GetEnvironmentVariable("GOOGLEAUTHSECRET");
        options.SignInScheme = "GoogleExternal";
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.UsePkce = true;
        options.CallbackPath = "/api/auth/google/callback";
        options.SaveTokens = false;

        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");

    })
    .AddCookie("GitHubExternal")
    .AddOAuth("GitHub", options =>
    {
        options.ClientId = Environment.GetEnvironmentVariable("GITHUBAUTHID")
                           ?? throw new InvalidOperationException("GITHUBAUTHID is missing.");

        options.ClientSecret = Environment.GetEnvironmentVariable("GITHUBAUTHSECRET")
                               ?? throw new InvalidOperationException("GITHUBAUTHSECRET is missing.");
        options.SignInScheme = "GitHubExternal";
        options.CallbackPath = "/api/auth/github/callback";
        options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
        options.TokenEndpoint = "https://github.com/login/oauth/access_token";
        options.UserInformationEndpoint = "https://api.github.com/user";
        options.SaveTokens = true;

        options.Scope.Add("read:user");
        options.Scope.Add("user:email");
        options.ClaimActions.MapJsonKey(ClaimTypes.NameIdentifier, "id");
        options.ClaimActions.MapJsonKey(ClaimTypes.Name, "name");
        options.ClaimActions.MapJsonKey("github_login", "login");
        options.ClaimActions.MapJsonKey(ClaimTypes.Email, "email");
        options.ClaimActions.MapJsonKey("picture", "avatar_url");

        options.Events.OnCreatingTicket = async context =>
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                context.Options.UserInformationEndpoint);

            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", context.AccessToken);

            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue(
                    "application/vnd.github+json"));

            request.Headers.UserAgent.ParseAdd("Kanban");

            using var response = await context.Backchannel.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                context.HttpContext.RequestAborted);

            response.EnsureSuccessStatusCode();

            using var user = JsonDocument.Parse(
                await response.Content.ReadAsStringAsync(
                    context.HttpContext.RequestAborted));

            context.RunClaimActions(user.RootElement);
        };
    })
    .AddCookie("MicrosoftExternal")
    .AddOpenIdConnect("Microsoft", options =>
    {
        options.Authority = "https://login.microsoftonline.com/common/v2.0";
        options.ClientId = Environment.GetEnvironmentVariable("MICROSOFTAUTHID")!;
        options.ClientSecret = Environment.GetEnvironmentVariable("MICROSOFTAUTHSECRETVALUE")!;
        options.SignInScheme = "MicrosoftExternal";
        options.CallbackPath = "/api/auth/microsoft/callback";
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.UsePkce = true;
        options.SaveTokens = false;

        var validator = AadIssuerValidator.GetAadIssuerValidator(options.Authority);
        options.TokenValidationParameters.IssuerValidator = validator.Validate;
        
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "KanbanBackend",
        Version = "v1"
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "KanbanBackend v1");
});

app.UseExceptionHandler();
app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<BoardHub>("/hubs/board")
    .RequireCors("Frontend");

app.Run();