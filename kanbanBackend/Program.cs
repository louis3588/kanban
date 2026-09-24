using System.Text;
using DotNetEnv;
using kanbanBackend.Data;
using kanbanBackend.Hubs;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
builder.Services.AddSignalR();
builder.Services.AddScoped<IJwtInterface, JwtService>();
builder.Services.AddScoped<IAuthInterface, AuthService>();
builder.Services.AddScoped<IUserDetailsInterface, UserDetailsService>();
builder.Services.AddScoped<CurrentUserService>();
builder.Services.AddScoped<WorkspaceAuthService>();
builder.Services.AddScoped<IEmailInterface, EmailService>();
builder.Services.AddScoped<IEmailConfirmationInterface, EmailConfirmationService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:8081", "http://localhost:19006")
            .AllowAnyHeader()
            .AllowAnyMethod();
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

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "KanbanBackend v1");
});
app.UseHttpsRedirection();
app.UseExceptionHandler();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<BoardHub>("/hubs/board");

app.Run();