import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import MobileNet from './DetectionTests/MobileNet';
import CocoSsd from './DetectionTests/CocoSsd';

function App() {
  return (
    <div className="app">      
      <h1>Image Object Detection</h1>
      <div className="object-detection-page">
        <Tabs>
          <TabList>
            <Tab>Tensorflow Coco SSD</Tab>
            <Tab>Tensorflow MobileNet</Tab>
          </TabList>
          <TabPanel>
            <CocoSsd />
          </TabPanel>
          <TabPanel>
            <MobileNet />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}

export default App;