import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getSurveyById, getSurveys, saveSurveys, setSurveyStatus } from '../lib/storage';
import { getPublicSurveyUrl } from '../lib/utils';

export default function PresentSurveyPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState('');
  const survey = getSurveyById(surveyId ?? '');

  useEffect(() => {
    if (!survey) return;
    const url = getPublicSurveyUrl(survey.slug);
    QRCode.toDataURL(url, { width: 260, margin: 2 })
      .then((value: string) => setQrCode(value))
      .catch(() => setQrCode(''));
  }, [survey]);

  if (!survey) {
    return <div className="p-8 text-center text-slate-500">Survey not found.</div>;
  }

  const handleClose = () => {
    const surveys = getSurveys();
    saveSurveys(setSurveyStatus(surveys, survey.id, 'closed'));
    navigate('/dashboard');
  };

  const handleDownload = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${survey.slug}-qr.png`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Present</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{survey.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link to={`/surveys/${survey.id}/results`} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100">
              View Results
            </Link>
            <button type="button" onClick={handleClose} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 font-medium text-amber-700 hover:bg-amber-100">
              Close Survey
            </button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
            {qrCode ? <img src={qrCode} alt="Survey QR code" className="h-64 w-64 rounded-xl bg-white p-4" /> : <div className="h-64 w-64 animate-pulse rounded-xl bg-slate-200" />}
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">Public survey link</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 break-all">
              {getPublicSurveyUrl(survey.slug)}
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleDownload} className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500">
                Download QR Code
              </button>
            </div>
            <div className="mt-8 rounded-xl bg-slate-50 p-4 text-slate-700">
              <p className="text-sm font-medium uppercase tracking-[0.2em]">Responses</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
