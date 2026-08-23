import Image from "next/image";
import styles from "./page.module.css";
import TopNavbar from "./components/ui/navigationComponent/topNavbar";
import MobileNavbar from "./components/ui/navigationComponent/mobileNavbar";
import AdminSidebar from "./components/ui/navigationComponent/adminSidebar";
import Pagination from "./components/ui/navigationComponent/pagination";
import BreadCrumbs from "./components/ui/navigationComponent/breadCrumbs";
import Tabs from "./components/ui/navigationComponent/tabs";

export default function Home() {
  return <Pagination />;
}
