using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace kanbanBackend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    
}