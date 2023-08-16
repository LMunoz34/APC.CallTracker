// Decompiled with JetBrains decompiler
// Type: APC.CallCenter.Services.PhoneNumberService
// Assembly: APC.CallCenter.Web, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: E92998D0-4A65-4D25-BC26-AE45E8F8AB42
// Assembly location: \\hrlwebsrv01\d$\Apps\APC.CallCenter.Web\APC.CallCenter.Web.exe

using APC.CallTracker.Models;
using APC.CallTracker.Services;
using APC.Core.Data;
using Dapper;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace APC.CallTracker.Services
{
    public class PhoneNumberService : ServiceBase
    {
        //FYI... this looks a little weird as it was decompiled using dotPeek

        public PhoneNumberService(IDatabase database) : base(database) { }

        public async Task<string> GetAttendantPhoneNumbers() => await this.GetAttendantPhoneNumbers(null, null, null);
        public async Task<string> GetAttendantPhoneNumbers(Language language) => await this.GetAttendantPhoneNumbers(null, language, null);
        public async Task<string> GetAttendantPhoneNumbers(Language language, bool usesToken) => await this.GetAttendantPhoneNumbers(null, language, usesToken);
        public async Task<string> GetAttendantPhoneNumbers(bool usesToken) => await this.GetAttendantPhoneNumbers(null, null, usesToken);

        public async Task<string> GetAttendantPhoneNumbers(string branches) => await this.GetAttendantPhoneNumbers(branches, new Language?(), new bool?());

        public async Task<string> GetAttendantPhoneNumbers(string branches, Language? language) => await this.GetAttendantPhoneNumbers(branches, language, new bool?());

        public async Task<string> GetAttendantPhoneNumbers(string branches, bool usesToken) => await this.GetAttendantPhoneNumbers(branches, new Language?(), new bool?(true));

        public async Task<string> GetAttendantPhoneNumbers(string branches, Language? language, bool? usesToken)
        {
            var data = new
            {
                branches = branches,
                language = language?.ToString(),
                usesToken = usesToken
            };

            var source = await Database.GetDbConnection().QueryAsync<AttendantContactInfo>("tracker.spGetProviderPhones", data, commandType: CommandType.StoredProcedure);
            return AttendantContactInfoToCsv(source.ToList());
        }

        public string AttendantContactInfoToCsv(List<AttendantContactInfo> attendants)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Name,Number");

            foreach (AttendantContactInfo attendant in attendants)
                sb.AppendLine("\"" + attendant.Name + "\",\"" + attendant.Number + "\"");

            return sb.ToString();
        }
    }
}
