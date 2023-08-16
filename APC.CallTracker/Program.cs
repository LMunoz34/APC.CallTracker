using APC.CallTracker.Config;
using APC.CallTracker.Services;
using APC.Core.Data;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authentication;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddOptions();
builder.Services.AddHttpContextAccessor();
var configuration = new GeneralConfiguration();
builder.Configuration.Bind("GeneralConfiguration", configuration);
builder.Services.AddSingleton(configuration);

var sqlDatabase = new SqlDatabase { ConnectionString = configuration.SQL_ConnectionString };
builder.Services.AddSingleton<IDatabase>(sqlDatabase);
builder.Services.AddSingleton<PhoneNumberService>();
builder.Services.AddSingleton<ClientService>();
builder.Services.AddSingleton<AttendantService>();
builder.Services.AddSingleton<CallTrackerService>();
builder.Services.AddSingleton<CallRecordService>();
builder.Services.AddSingleton<ReasonCodeService>();
builder.Services.AddSingleton<DashboardService>();
builder.Services.AddSingleton<VersioningService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseAuthentication();
app.UseAuthorization();

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.Run();
