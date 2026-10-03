import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/client';
import { ArrowLeft, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

function buildReturnCertificateNumber(applicationNumber, applicationId) {
  const digits = String(applicationNumber || applicationId || '').replace(/\D/g, '');
  const tail = digits.slice(-4).padStart(4, '0');
  return `LDTREC${tail}`;
}

export default function ApplicationReceipt() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  const receiptType = useMemo(() => {
    if (type === 'rejection') return 'rejection';
    if (type === 'return') return 'return';
    return 'acknowledgment';
  }, [type]);

  useEffect(() => {
    const fetchApp = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/applications/${id}`);
        setApp(data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load receipt data');
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [id]);

  const applicationNumber = app?.application_number || app?.applicationNumber;
  const submittedAt = app?.submitted_at || app?.created_at || app?.createdAt || Date.now();
  const parcelCode = app?.parcel?.parcel_code || app?.parcel?.parcelCode || app?.parcel_code || '-';
  const appType = (app?.application_type || app?.applicationType || '').replace(/_/g, ' ');
  const txns = app?.transactions || [];
  const returnCertificateNumber = useMemo(() => {
    if (!app || receiptType !== 'return') return '';
    return buildReturnCertificateNumber(applicationNumber, app.id);
  }, [app, applicationNumber, receiptType]);

  useEffect(() => {
    if (app && receiptType === 'return' && returnCertificateNumber) {
      sessionStorage.setItem(`crprs_return_certificate_${app.id}`, returnCertificateNumber);
    }
  }, [app, receiptType, returnCertificateNumber]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading receipt...</div>;
  }

  if (!app) {
    return <div className="text-sm text-rose-600">Unable to load application receipt.</div>;
  }

  if (receiptType === 'return') {
    const documentsGiven = txns.length > 0 ? 'Title Certificate' : 'N/A';
    const lodgerName = app.submitter?.fullName || app.submitter?.full_name || 'Front Desk Officer';

    return (
      <div className="space-y-4">
        <div className="print:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4">
          <button
            onClick={() => navigate('/applications')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        <div className="bg-white border border-slate-300 rounded-lg p-8 text-sm text-slate-800 max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold">RPRS</h2>
            <p className="text-base font-semibold">REAL PROPERTY REGISTRATION SYSTEM</p>
            <p className="mt-4 inline-block border-2 border-sky-400 px-4 py-1 font-bold text-slate-900 shadow-sm">
              CONFIRMATION OF APPLICATION RETURN
            </p>
          </div>

          <div className="space-y-2">
            <div><strong>Registration No</strong> {applicationNumber}</div>
            <div><strong>Certificate Number</strong> {returnCertificateNumber}</div>
            <div><strong>Lodgment Date</strong> {new Date(submittedAt).toLocaleString()}</div>
          </div>

          <p className="mt-5 font-medium">
            This receipt acknowledges that the application which requested below is returned
          </p>

          <div className="mt-4 space-y-2">
            <div><strong>Applicant</strong></div>
            <div className="pl-6"><strong>Applicant Name:</strong> {app.applicant_name || app.applicantName}</div>
            <div className="pl-6"><strong>Application Type:</strong> {appType}</div>
            <div className="pl-6"><strong>Documents given to the applicant:</strong> {documentsGiven}</div>
          </div>

          <div className="mt-8 flex justify-between gap-8 text-center text-sm">
            <div className="flex-1 border-t border-slate-400 pt-2">
              Lodged by: {lodgerName}
              <div className="mt-2">Signature : ____________</div>
            </div>
            <div className="flex-1 border-t border-slate-400 pt-2">
              Applicant: {app.applicant_name || app.applicantName}
              <div className="mt-2">Signature : ____________</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4">
        <button
          onClick={() => navigate('/applications')}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" /> Print Two Copies
        </button>
      </div>

      {['CUSTOMER COPY', 'OFFICE COPY'].map((label, idx) => (
        <div key={label} className={`bg-white border border-slate-300 rounded-lg p-5 text-xs text-slate-800 ${idx === 0 ? 'print:break-after-page' : ''}`}>
          <div className="text-center mb-4">
            <h2 className="text-base font-bold">RPRS - REAL PROPERTY REGISTRATION SYSTEM</h2>
            <p className="font-semibold text-blue-900">
              {receiptType === 'rejection'
                ? 'CONFIRMATION OF APPLICATION REJECTION'
                : 'CONFIRMATION OF APPLICATION REGISTRATION SUBMISSION'}
            </p>
            <p className="text-slate-500">{label}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
            <div><strong>Application No:</strong> {applicationNumber}</div>
            <div><strong>Certificate No:</strong> {app.certificate_number || 'N/A'}</div>
            <div><strong>Status:</strong> {receiptType === 'rejection' ? 'WITHDRAWN' : 'SUBMITTED'}</div>
            <div><strong>Lodgment Date:</strong> {new Date(submittedAt).toLocaleString()}</div>
          </div>

          <div className="mb-4">
            <p><strong>Applicant Name:</strong> {app.applicant_name || app.applicantName}</p>
            <p><strong>Application Type:</strong> {appType}</p>
            <p><strong>Parcel Code:</strong> {parcelCode}</p>
          </div>

          <div className="mb-4">
            <h4 className="font-bold mb-1">Transactions</h4>
            <table className="w-full border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-1.5 border border-slate-300 text-left">No</th>
                  <th className="p-1.5 border border-slate-300 text-left">Transaction Type</th>
                </tr>
              </thead>
              <tbody>
                {txns.length > 0 ? (
                  txns.map((t, index) => (
                    <tr key={t.id || index}>
                      <td className="p-1.5 border border-slate-300">{index + 1}</td>
                      <td className="p-1.5 border border-slate-300">{(t.transaction_type || t.transactionType || '').replace(/_/g, ' ')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-1.5 border border-slate-300" colSpan="2">No transaction listed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {receiptType === 'rejection' && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded">
              <strong>Reason:</strong> {app.withdrawn_reason || app.withdrawnReason || 'No rejection reason recorded'}
            </div>
          )}

          <div className="pt-6 grid grid-cols-2 gap-8 text-center">
            <div className="border-t border-slate-300 pt-2">Lodged by: ____________________</div>
            <div className="border-t border-slate-300 pt-2">Signature: ____________________</div>
          </div>
        </div>
      ))}
    </div>
  );
}
