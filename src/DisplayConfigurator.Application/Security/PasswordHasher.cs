using System.Security.Cryptography;

namespace DisplayConfigurator.Application.Security;

/// <summary>
/// PBKDF2 (Rfc2898) tabanlı parola özetleme. Harici bir kütüphane (BCrypt vb.)
/// eklemeden .NET'in yerleşik kriptografi API'siyle, tuzlanmış ve yavaşlatılmış
/// (100.000 iterasyon) bir özet üretir — düz metin parola asla saklanmaz.
///
/// Saklanan biçim: "{iterasyon}.{tuz-base64}.{özet-base64}"
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('.', 3);
        if (parts.Length != 3) return false;
        if (!int.TryParse(parts[0], out var iterations)) return false;

        var salt = Convert.FromBase64String(parts[1]);
        var expectedKey = Convert.FromBase64String(parts[2]);
        var actualKey = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedKey.Length);

        return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
    }
}
