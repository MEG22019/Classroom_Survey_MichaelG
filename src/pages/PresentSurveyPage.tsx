import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { closeSurvey, fetchSurveyById, getSubmissionsForSurvey } from '../lib/storage';
import type { Survey } from '../lib/types';
import { getPublicSurveyUrl } from '../lib/utils';

export default function PresentSurveyPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSurvey = async () => {
      if (!surveyId) {
        setSurvey(null);
        return;
      }

      const nextSurvey = await fetchSurveyById(surveyId);
      if (active) {
        setSurvey(nextSurvey ?? null);
      }
    };

    void loadSurvey();
    return () => { active = false; };
  }, [surveyId]);

  useEffect(() => {
    if (!survey) return;

    const url = getPublicSurveyUrl(survey.slug);
    QRCode.toDataURL(url, { width: 300, margin: 2 })
      .then((value: string) => {
        setQrCode(value);
        setIsLoading(false);
      })
      .catch(() => {
        setQrCode('');
        setIsLoading(false);
      });
  }, [survey]);

  if (!survey) {
    return <div className="p-8 text-center text-slate-500">Survey not found.</div>;
  }

  const responseCount = getSubmissionsForSurvey(survey.id).length;

  const handleClose = async () => {
    try {
      await closeSurvey(survey.id);
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Present</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{survey.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/surveys/${survey.id}/results`} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100">
              View Results
            </Link>
            <button type="button" onClick={() => void handleClose()} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 font-medium text-amber-700 hover:bg-amber-100">
              Close Survey
            </button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
            {isLoading ? (
              <div className="h-64 w-64 animate-pulse rounded-xl bg-slate-200" />
            ) : qrCode ? (
              <img src={qrCode} alt="Survey QR code" className="h-64 w-64 rounded-xl bg-white p-4 md:h-72 md:w-72" />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 md:h-72 md:w-72">
                QR code unavailable
              </div>
            )}
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
              <p className="mt-2 text-3xl font-bold text-slate-900">{responseCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
