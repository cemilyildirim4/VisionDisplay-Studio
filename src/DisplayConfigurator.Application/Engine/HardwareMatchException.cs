namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// Katalog eşleşmesi başarısız olduğunda (uygun PSU/işlemci vb. yok)
/// hesap motoru jenerik değere düşmez; bu hata döner.
/// </summary>
public sealed class HardwareMatchException : ArgumentException
{
    public HardwareMatchException(string message) : base(message) { }
}
