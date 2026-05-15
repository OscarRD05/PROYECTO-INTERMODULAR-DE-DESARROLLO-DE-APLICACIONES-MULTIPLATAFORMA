using Android.App;
using Android.Content.PM;
using Android.Nfc;
using Android.OS;

namespace App;

[Activity(
    Theme = "@style/Maui.SplashTheme",
    MainLauncher = true,
    LaunchMode = LaunchMode.SingleTask,
    ConfigurationChanges = ConfigChanges.ScreenSize
                         | ConfigChanges.Orientation
                         | ConfigChanges.UiMode
                         | ConfigChanges.ScreenLayout
                         | ConfigChanges.SmallestScreenSize
                         | ConfigChanges.Density)]
public class MainActivity : MauiAppCompatActivity, NfcAdapter.IReaderCallback
{
    private NfcAdapter? _nfcAdapter;
    private bool _readerModeEnabled;

    public static event Action<string>? NfcTagDiscovered;
    public static bool NfcSupported { get; private set; }
    public static bool NfcEnabled { get; private set; }

    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);

        _nfcAdapter = NfcAdapter.GetDefaultAdapter(this);
        NfcSupported = _nfcAdapter != null;

        if (NfcSupported)
        {
            NfcEnabled = _nfcAdapter!.IsEnabled;
        }
    }

    protected override void OnResume()
    {
        base.OnResume();

        if (NfcSupported)
        {
            NfcEnabled = _nfcAdapter!.IsEnabled;
        }

        EnableReaderMode();
    }

    protected override void OnPause()
    {
        base.OnPause();
        DisableReaderMode();
    }

    protected override void OnNewIntent(Android.Content.Intent? intent)
    {
        base.OnNewIntent(intent);

        if (intent == null) return;

        System.Diagnostics.Debug.WriteLine($"[NFC] OnNewIntent: accion={intent.Action}");

        if (intent.Action == NfcAdapter.ActionTagDiscovered
            || intent.Action == NfcAdapter.ActionNdefDiscovered
            || intent.Action == NfcAdapter.ActionTechDiscovered)
        {
            var tag = intent.GetParcelableExtra(NfcAdapter.ExtraTag) as Tag;
            if (tag != null)
            {
                HandleTag(tag);
            }
        }
    }

    private void EnableReaderMode()
    {
        if (_nfcAdapter == null || !_nfcAdapter.IsEnabled) return;

        try
        {
            var flags = NfcReaderFlags.NfcA | NfcReaderFlags.NfcB
                       | NfcReaderFlags.NfcF | NfcReaderFlags.NfcV
                       | NfcReaderFlags.SkipNdefCheck;

            var extras = new Bundle();
            extras.PutBoolean("presence", true);

            _nfcAdapter.EnableReaderMode(this, this, flags, extras);
            _readerModeEnabled = true;

            System.Diagnostics.Debug.WriteLine("[NFC] Modo lector activado");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[NFC] Error al activar modo lector: {ex.Message}");
        }
    }

    private void DisableReaderMode()
    {
        if (_nfcAdapter == null || !_readerModeEnabled) return;

        try
        {
            _nfcAdapter.DisableReaderMode(this);
            _readerModeEnabled = false;

            System.Diagnostics.Debug.WriteLine("[NFC] Modo lector desactivado");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[NFC] Error al desactivar modo lector: {ex.Message}");
        }
    }

    public void OnTagDiscovered(Tag? tag)
    {
        if (tag == null) return;

        HandleTag(tag);
    }

    private void HandleTag(Tag tag)
    {
        byte[]? idBytes = tag.GetId();
        if (idBytes == null || idBytes.Length == 0) return;

        string uid = BitConverter.ToString(idBytes).Replace("-", "").ToLowerInvariant();

        System.Diagnostics.Debug.WriteLine($"[NFC] Tag detectado: {uid}");

        NfcTagDiscovered?.Invoke(uid);
    }
}