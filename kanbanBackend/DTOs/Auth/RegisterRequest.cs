using System.ComponentModel.DataAnnotations;

namespace kanbanBackend.DTOs.Auth;

public class RegisterRequest
{
    [Required]
    [MaxLength(50)] 
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
    
}