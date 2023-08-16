using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class AttendantLog
    {
        public int CallID { get; set; }
        public string Attendant_Vesta_provnumber { get; set; }
        public string Attendate_Vesta_branch { get; set; }
        public string AttendantName { get; set; }
        public bool? VerifiedClient { get; set; }
        public bool? VerifiedAttendant { get; set; }
        public bool? LeftMessage { get; set; }
        public bool? Needs2067Form { get; set; }
        public int NumberOfLinesCleared { get; set; }
        public string ManualNotes { get; set; }
        public string TokenNotes { get; set; }
        public string CodeID { get; set; }
        public string CodedNotes { get; set; }
    }
}
