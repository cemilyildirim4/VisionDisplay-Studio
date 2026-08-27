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
        DevOrBeta(environment, config);

    /// <summary>
    /// Sohbet kaydı ve geri bildirim yazma: yalnızca Development veya beta.
    /// Canlıda anonim gözlem uçları kapalıdır.
    /// </summary>
    public static bool ObservationWriteEnabled(IHostEnvironment environment, IConfiguration config) =>
        DevOrBeta(environment, config);

    /// <summary>
    /// Sohbet kaydı yazma CANLIDA DA AÇIKTIR.
    ///
    /// Asistanın hangi soruları anlayamadığını ancak gerçek kullanıcılardan
    /// öğrenebiliyoruz. Kayıt kapalıyken yönetim panelindeki "Cevaplanamayan
    /// Soru" listesi hep boş kalıyor, bilgi tabanı da körlemesine büyütülüyordu.
    ///
    /// Kayıtta kişisel veri tutulmaz: yalnızca sorunun metni, eşleşen konu ve
    /// dil saklanır. Gerektiğinde ChatLogs:Enabled=false ile kapatılabilir.
    /// </summary>
    public static bool ChatLogWriteEnabled(IConfiguration config) =>
        config.GetValue("ChatLogs:Enabled", true);

    public static bool DevOrBeta(IHostEnvironment environment, IConfiguration config) =>
        environment.IsDevelopment() || config.GetValue<bool>("Beta:Enabled");

    public static string[] AssignableRoles(IHostEnvironment environment, IConfiguration config) =>
        TesterEnabled(environment, config) ? AllAssignableRoles : ProductionRoles;
}
