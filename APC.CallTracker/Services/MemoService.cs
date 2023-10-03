using APC.CallTracker.Config;
using APC.CallTracker.Models;
using Microsoft.EntityFrameworkCore;

namespace APC.CallTracker.Services
{
    public class MemoService
    {
        private readonly AppDbContext _context;

        public MemoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<NewReasonCodeTemplate>> GetAllTemplatesAsync()
        {
            return await _context.NewReasonCodeTemplates.ToListAsync();
        }


        public async Task<NewReasonCodeTemplate> GetTemplateAsync(string codeId)
        {
            return await _context.NewReasonCodeTemplates.FirstOrDefaultAsync(x => x.CodeID == codeId);
        }   

        public async Task<NewReasonCodeTemplate> AddTemplateAsync(NewReasonCodeTemplate template)
        {
            _context.NewReasonCodeTemplates.Add(template);
            await _context.SaveChangesAsync();
            return template;
        }

        public async Task<NewReasonCodeTemplate> UpdateTemplateAsync(NewReasonCodeTemplate template)
        {
            _context.Entry(template).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return template;
        }

        public async Task DeleteTemplateAsync(string codeId)
        {
            var template = await _context.NewReasonCodeTemplates.FindAsync(codeId);
            _context.NewReasonCodeTemplates.Remove(template);
            await _context.SaveChangesAsync();
        }
        // Add other CRUD methods here...
    }
}
