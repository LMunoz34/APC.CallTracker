using APC.CallTracker.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace APC.CallTracker.Config
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
        {
        }

        public DbSet<NewReasonCodeTemplate> NewReasonCodeTemplates { get; set; }
    }
}