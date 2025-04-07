import { ConnectButton } from "@rainbow-me/rainbowkit";
import CertificateViewer from "./components/CertificateViewer";
import FractionalCert from "./components/FractionalCert";
import MarketplaceUI from "./components/Marketplace";

const App = () => {
  return (
    <div className="p-6">
      <ConnectButton />
      <CertificateViewer />
      <FractionalCert />
      <MarketplaceUI />
    </div>
  );
};

export default App;
