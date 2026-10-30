using kanbanBackend.Services.Auth;

namespace kanbanBackend.Hubs.Filters;


using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;

public class CurrentUserHubFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var principal = invocationContext.Context.User;

        if (principal?.Identity?.IsAuthenticated != true)
        {
            throw new HubException(
                "You must be authenticated to perform this action");
        }
        var currentUser = invocationContext.ServiceProvider
            .GetRequiredService<CurrentUserService>();

        currentUser.SetHubPrincipal(principal);
        return await next(invocationContext);
    }
}
