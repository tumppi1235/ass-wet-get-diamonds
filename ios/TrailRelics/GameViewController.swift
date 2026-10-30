import UIKit
import WebKit
import CoreLocation

private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, CLLocationManagerDelegate {
    private var webView: WKWebView!
    private let locationManager = CLLocationManager()
    private var requested = false
    private var assetsDirectory: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.953, green: 0.945, blue: 0.914, alpha: 1)
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(WeakMessageHandler(self), name: "trailRelics")
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = kCLDistanceFilterNone
        locationManager.activityType = .fitness
        locationManager.pausesLocationUpdatesAutomatically = true
        NotificationCenter.default.addObserver(self, selector: #selector(pauseForBackground), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(resumeForForeground), name: UIApplication.didBecomeActiveNotification, object: nil)
        if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "assets") {
            assetsDirectory = index.deletingLastPathComponent()
            webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
        } else {
            let label = UILabel(frame: view.bounds)
            label.text = "Game assets missing. Rebuild the Xcode project."
            label.textAlignment = .center
            label.numberOfLines = 0
            view.addSubview(label)
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        locationManager.stopUpdatingLocation()
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "trailRelics")
    }

    private func evaluate(_ script: String) { webView.evaluateJavaScript(script, completionHandler: nil) }
    private func status(_ message: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: [message]), let json = String(data: data, encoding: .utf8) else { return }
        evaluate("window.gpsStatus && window.gpsStatus((\(json))[0])")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true, let action = message.body as? String else { return }
        if action == "start" { requested = true; startLocation() }
        else if action == "stop" { requested = false; stopLocation(); status("GPS paused. Tap Start GPS to continue.") }
    }

    private func startLocation() {
        guard requested, UIApplication.shared.applicationState == .active else { return }
        switch locationManager.authorizationStatus {
        case .notDetermined: locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            guard locationManager.accuracyAuthorization == .fullAccuracy else {
                status("Enable Precise Location for Trail Relics in Settings, then tap Start GPS.")
                return
            }
            status("Waiting for an accurate GPS fix. Go outdoors.")
            locationManager.startUpdatingLocation()
            UIApplication.shared.isIdleTimerDisabled = true
        case .denied, .restricted:
            status("Allow location while using Trail Relics in Settings, then tap Start GPS.")
        @unknown default: status("Location is unavailable on this device.")
        }
    }

    private func stopLocation() {
        locationManager.stopUpdatingLocation()
        UIApplication.shared.isIdleTimerDisabled = false
    }

    @objc private func pauseForBackground() {
        stopLocation()
        evaluate("window.pauseGps && window.pauseGps()")
    }
    @objc private func resumeForForeground() { if requested { startLocation() } }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { if requested { startLocation() } }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        status("GPS unavailable. Check location settings and try outdoors.")
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard requested, UIApplication.shared.applicationState == .active, let location = locations.last,
              location.horizontalAccuracy >= 0, abs(location.timestamp.timeIntervalSinceNow) <= 10 else { return }
        // Xcode route playback is permitted only when compiled for the Simulator.
        #if !targetEnvironment(simulator)
        if location.sourceInformation?.isSimulatedBySoftware == true { status("Waiting for a real GPS fix."); return }
        #endif
        let fix: [String: Any] = ["lat": location.coordinate.latitude, "lon": location.coordinate.longitude,
                                  "accuracy": location.horizontalAccuracy, "time": location.timestamp.timeIntervalSince1970 * 1000,
                                  "speed": max(0, location.speed)]
        if let data = try? JSONSerialization.data(withJSONObject: fix), let json = String(data: data, encoding: .utf8) {
            evaluate("window.onGps && window.onGps(\(json))")
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let directory = assetsDirectory,
              url.isFileURL, url.standardizedFileURL.path.hasPrefix(directory.standardizedFileURL.path + "/") else { decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
}
