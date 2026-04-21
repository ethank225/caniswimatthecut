import { useConditions } from "../hooks/useConditions.js";
import Header from "../components/Header.jsx";
import Verdict from "../components/Verdict.jsx";
import AlertBanner from "../components/AlertBanner.jsx";
import Forecast7Day from "../components/Forecast7Day.jsx";
import WaterCard from "../components/WaterCard.jsx";
import StatsRow from "../components/StatsRow.jsx";
import RainBar from "../components/RainBar.jsx";
import HistoryCalendar from "../components/HistoryCalendar.jsx";
import PoliceFeed from "../components/PoliceFeed.jsx";
import CopsAtTheCut from "../components/CopsAtTheCut.jsx";
import ReportFAB from "../components/ReportFAB.jsx";
import Footer from "../components/Footer.jsx";

export default function Home() {
  const { data, error } = useConditions();
  const loading = !data && !error;

  return (
    <div className="flex justify-center px-5 pb-20 pt-10">
      <div className="w-full max-w-[440px]">
        <Header />
        <AlertBanner data={data} />
        <Verdict verdict={data?.verdict} reason={data?.reason} loading={loading} error={error} />
        <Forecast7Day forecast={data?.forecast_7day} loading={loading} />
        <WaterCard water={data?.water} loading={loading} />
        <StatsRow weather={data?.weather} loading={loading} />
        <RainBar weather={data?.weather} loading={loading} />
        <HistoryCalendar />
        <PoliceFeed alerts={data?.alerts} loading={loading} />
        <CopsAtTheCut />
        <Footer updatedAt={data?.updated_at} loading={loading} />
      </div>
      <ReportFAB />
    </div>
  );
}
