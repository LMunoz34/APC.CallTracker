using APC.CallTracker.Models;
using APC.Core.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Newtonsoft.Json.Linq;
using APC.CallTracker.Config;
using System.Net.Mail;
using System.Net;
using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using Serilog;

namespace APC.CallTracker.Services
{
    public class CallTrackerService : ServiceBase
    {
        private GeneralConfiguration GeneralConfiguration { get; set; }

        public CallTrackerService(IDatabase database, GeneralConfiguration generalConfiguration) : base(database)
        {
            GeneralConfiguration = generalConfiguration;
        }

        public int SaveCallRecord(string jsonRecord)
        {
            var recordsAffected = Database.GetDbConnection().ExecuteScalar<int>("tracker.spSaveCallRecord", param: new { json = jsonRecord }, commandType: CommandType.StoredProcedure);
            try
            {
                Email2067Notifications(jsonRecord);
            }
            catch (Exception ex )
            {
                Log.Error(ex, "Error attempting to send 2067 email.");
            }

            return recordsAffected;
        }

        private void Email2067Notifications(string jsonRecord)
        {
            if (string.IsNullOrEmpty(jsonRecord)) return;

            dynamic record = JObject.Parse(jsonRecord);
            var attendants = new List<dynamic>();

            var recipients = new List<string>();
            var fromEmail = GetEmailForUser(record.userName.Value);

            foreach (dynamic recipient in record.emailRecipients)
            {
                recipients.Add(recipient.ToString());
            }

            var emails = new List<EmailInfo>();

            foreach (dynamic log in record.attendantLogs)
            {
                if (CodeRequires2067(log.code.ToString()) == false) continue;

                if (recipients.Count == 0)
                {
                    var branch = record.client?.branch?.ToString();
                    if (string.IsNullOrEmpty(branch)) return;

                    recipients = GetEmailRecipients()
                                    .Where(r => r.BranchCode == branch)
                                    .Select(r => r.EmailAddress)
                                    .ToList();
                }

                emails.Add(new EmailInfo
                {
                    Attendant = log.attendant.providerName,
                    Client = record.client.clientName,
                    Recipients = recipients,
                    Memo = log.freeText,
                    From = fromEmail,
                    Zip = record.client.zip.Value,
                });
            }

             Task.Run(() => SendEmails(emails)).Wait();
        }

        public string GetEmailForUser(string userName)
        {
            if (string.IsNullOrEmpty(userName)) return "";
            return Database.GetDbConnection().ExecuteScalar<string>("tracker.spGetEmailForUser", param: new { userName }, commandType: CommandType.StoredProcedure);
        }

        public dynamic GetAudioFile(int cdrID)
        {
            return Database.SelectOne<dynamic>("tracker.spGetAudioFile", param: new { cdrID }, commandType: CommandType.StoredProcedure);
        }

        private bool CodeRequires2067(string codeId)
        {
            var sql = $"select(isnull((select Needs2067 from tracker.ReasonCodeTemplate where CodeID = '{codeId}'), 0))";
            var isRequired = Database.GetDbConnection().ExecuteScalar<bool>(sql);
            return isRequired;
        }

        private async Task SendEmails(List<EmailInfo> emailConfigs)
        {
            if (emailConfigs?.Count == 0) return;            

            using (var smtp = new SmtpClient())
            {
                smtp.Host = GeneralConfiguration.SmtpHost;
                smtp.Port = GeneralConfiguration.SmtpPort;
                smtp.Credentials = new NetworkCredential(GeneralConfiguration.SmtpUser, GeneralConfiguration.SmtpPassword);
                smtp.Timeout = 30_000; //30 secs

                foreach (var emailConfig in emailConfigs)
                {
                    var body = GenerateEmailMessage(emailConfig);
                    var subject = $"[2067] ({emailConfig.Zip}) - {emailConfig.Client} ";

                    using (var msg = new MailMessage())
                    {
                        if (string.IsNullOrEmpty(emailConfig.From))
                        {
                            var noReplyAddress = new MailAddress("noreply@apchh.com");
                            msg.From = noReplyAddress;
                            msg.ReplyToList.Add(noReplyAddress);
                        }                            
                        else
                        {
                            var senderAddress = new MailAddress(emailConfig.From);
                            msg.From = senderAddress;
                            msg.ReplyToList.Add(senderAddress);
                            msg.Bcc.Add(senderAddress);
                        }

                        foreach (var recipient in emailConfig.Recipients)
                            msg.To.Add(new MailAddress(recipient));

                        if (Debugger.IsAttached)
                        {
                            msg.To.Clear();
                            msg.To.Add("michael@apchh.com");
                        }
                        
                        msg.Body = body;
                        msg.IsBodyHtml = false;
                        msg.Priority = MailPriority.High;
                        msg.Subject = subject;                        

                        //msg.Bcc.Add(new MailAddress("michael@apchh.com"));

                        await smtp.SendMailAsync(msg);
                    }                    
                }                
            }
        }

        private string GenerateEmailMessage(EmailInfo emailConfig)
        {
            var msg = new StringBuilder();
            msg.AppendLine("Hello,");
            msg.AppendLine();
            msg.AppendLine($"Client: {emailConfig.Client}");
            msg.AppendLine($"Attendant: {emailConfig.Attendant}");
            msg.AppendLine();
            msg.AppendLine($"{emailConfig.Memo}");
            msg.AppendLine();
            msg.AppendLine("Thanks!");
            msg.AppendLine();
            return msg.ToString();
        }

        public List<EmailRecipient> GetEmailRecipients()
        {
            return Database.Select<EmailRecipient>("tracker.spGetEmailRecipients", CommandType.StoredProcedure);
        }

        public List<ElementLookupValue> GetElementLookupValues()
        {
            return Database.Select<ElementLookupValue>("tracker.spGetElementLookupValues", CommandType.StoredProcedure);
        }

        public List<Attendant> GetAttendants()
        {
            return Database.Select<Attendant>("tracker.spGetAttendants", CommandType.StoredProcedure);
        }

        public List<Branch> GetBranches()
        {
            return Database.Select<Branch>("spGetBranches", CommandType.StoredProcedure);
        }

        public dynamic GetCallLogsAndAttendants(DateTime? startDate, DateTime? endDate, string userNames)
        {
            var @params = new
            {
                startDate,
                endDate,
                userNames
            };

            using (var records = Database.GetDbConnection().QueryMultiple("tracker.spGetCallLogsAndAttendants", param: @params, commandType: CommandType.StoredProcedure))
            {
                var logs = records.Read<dynamic>();
                var attendants = records.Read<dynamic>();
                return new { logs, attendants };
            }
        }

        public List<dynamic> GetCallLogs(DateTime? startDate, DateTime? endDate, string userNames)
        {
            var @params = new
            {
                startDate,
                endDate,
                userNames
            };

            var records = Database.Select<dynamic>("tracker.spGetCallLogs", param: @params, commandType: CommandType.StoredProcedure);
            return records;
        }

        public List<dynamic> GetCDRByDate(DateTime? startDate, DateTime? endDate, string userNames, string phoneNumber)
        {
            var @params = new
            {
                startDate,
                endDate,
                phoneNumber = phoneNumber?.Replace("-",""),
                userNames
            };

            var records = Database.Select<dynamic>("tracker.spGetCDRByDate", param: @params, commandType: CommandType.StoredProcedure);
            return records;
        }

        public List<dynamic> GetCallLogAttendants(DateTime? startDate, DateTime? endDate, string userNames)
        {
            var @params = new
            {
                startDate,
                endDate,
                userNames
            };

            var records = Database.Select<dynamic>("tracker.spGetCallLogAttendants", param: @params, commandType: CommandType.StoredProcedure);
            return records;
        }
    }
}
