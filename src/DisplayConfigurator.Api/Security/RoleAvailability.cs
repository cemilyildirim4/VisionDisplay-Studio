namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Canlıda roller: Guest (anonim), Dealer, Admin.
/// Tester yalnızca Development veya Beta:Enabled ortamına aittir.
/// </summary>
public static class RoleAvailability
{
    public static readonly string[] ProductionRoles = ["Admin", "Dealer"];
    public static readonly string[] AllAssignableRoles = ["Admin", "Dealer", "Tester"];

    public static bool TesterEnabled(IHostEnvironment environment, IConfiguration config) =>
        environment.IsDevelopment() || config.GetValue<bool>("Beta:Enabled");

    public static string[] AssignableRoles(IHostEnvironment environment, IConfiguration config) =>
        TesterEnabled(environment, config) ? AllAssignableRoles : ProductionRoles;
}
