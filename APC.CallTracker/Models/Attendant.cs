using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class Attendant
    {
        public string Branch { get; set; }
        public string ProviderNumber { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Address { get; set; }
        public int AttendantID { get; set; }
        public string SearchField => $"{ProviderNumber} {FullName} {Address} {AttendantID}";
        public string FullName => GetFullName();

        private string GetFullName()
        {
            return $"{LastName}, {FirstName}";
        }
    }
}
