package fi.trailrelics.app;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.location.*;
import android.webkit.*;
import android.view.View;
import org.json.JSONObject;

public class MainActivity extends Activity implements LocationListener {
    private WebView web;
    private LocationManager locations;
    private boolean requested=false, resumed=false;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web=new WebView(this);
        // Fit system bars on Android 15 as well as older phones.
        web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        web.setBackgroundColor(0xfff3f1e9);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setAllowFileAccessFromFileURLs(false);
        web.getSettings().setAllowUniversalAccessFromFileURLs(false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req){return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){
                if(!req.getUrl().toString().startsWith("file:///android_asset/"))return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
                return null;
            }
        });
        web.addJavascriptInterface(new Object(){
            @JavascriptInterface public void startGps(){runOnUiThread(()->{requested=true;startLocation();});}
            @JavascriptInterface public void stopGps(){runOnUiThread(()->{requested=false;stopLocation();});}
        },"TrailNative");
        locations=(LocationManager)getSystemService(LOCATION_SERVICE);
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }
    private void status(String value){web.evaluateJavascript("window.gpsStatus&&window.gpsStatus("+JSONObject.quote(value)+")",null);}
    private void startLocation(){
        if(!requested||!resumed)return;
        if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},1);return;
        }
        try{
            if(!locations.isProviderEnabled(LocationManager.GPS_PROVIDER)){status("Enable phone GPS, then tap Start GPS again.");return;}
            locations.removeUpdates(this);
            locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,1000,0,this);
            status("Waiting for an accurate GPS fix. Go outdoors.");
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }catch(SecurityException e){status("Precise location permission is required.");}
    }
    private void stopLocation(){locations.removeUpdates(this);getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);status("GPS paused. Tap Start GPS to continue.");}
    @Override public void onRequestPermissionsResult(int code,String[] perms,int[] results){super.onRequestPermissionsResult(code,perms,results);if(code==1){if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED)startLocation();else status("Choose precise location in app permissions, then tap Start GPS.");}}
    @Override protected void onResume(){super.onResume();resumed=true;web.onResume();if(requested)startLocation();}
    @Override protected void onPause(){resumed=false;web.evaluateJavascript("window.pauseGps&&window.pauseGps()",null);stopLocation();web.onPause();super.onPause();}
    @Override protected void onDestroy(){stopLocation();web.removeJavascriptInterface("TrailNative");web.destroy();super.onDestroy();}
    @Override public void onLocationChanged(Location loc){
        long age=(android.os.SystemClock.elapsedRealtimeNanos()-loc.getElapsedRealtimeNanos())/1000000;
        if(age>10000||loc.isMock()){status("Waiting for a fresh, real GPS fix.");return;}
        String data="{\"lat\":"+loc.getLatitude()+",\"lon\":"+loc.getLongitude()+",\"accuracy\":"+loc.getAccuracy()+",\"time\":"+loc.getTime()+",\"speed\":"+(loc.hasSpeed()?loc.getSpeed():0)+"}";
        web.evaluateJavascript("window.onGps&&window.onGps("+data+")",null);
    }
    @Override public void onProviderDisabled(String provider){status("GPS disabled. Enable phone location.");}
    @Override public void onProviderEnabled(String provider){if(requested)startLocation();}
    @Override public void onStatusChanged(String provider,int status,Bundle extras){}
}
