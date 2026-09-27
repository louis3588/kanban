
import LandingPage from '../components/landing/LandingPage.web';
import LandingPageNative from '../components/landing/LandingPage.native'
import {Platform} from "react-native";
export default function Index() {
  if(Platform.OS === "web"){
    return <LandingPage />
  } else {
    return <LandingPageNative />
  }
}
