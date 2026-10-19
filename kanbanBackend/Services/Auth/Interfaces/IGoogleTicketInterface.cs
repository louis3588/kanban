namespace kanbanBackend.Services.Auth.Interfaces;

public interface IGoogleTicketInterface
{
    string CreateTicket(int userId);
    int ValidateTicket(string ticket);
}