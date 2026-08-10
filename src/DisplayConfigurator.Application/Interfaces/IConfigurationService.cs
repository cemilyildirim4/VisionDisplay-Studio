using DisplayConfigurator.Application.DTOs;

namespace DisplayConfigurator.Application.Interfaces;

public interface IConfigurationService
{
    Task<IEnumerable<ConfigurationResponseDto>> GetAllAsync();
    Task<ConfigurationResponseDto?> GetByIdAsync(int id);
    Task<ConfigurationResponseDto> CreateAsync(CreateConfigurationDto dto);
    Task<bool> DeleteAsync(int id);
    Task<byte[]?> GenerateSpecSheetPdfAsync(int id);
    Task<byte[]> GenerateSpecSheetPdfFromDtoAsync(CreateConfigurationDto dto);
    
}