# Reference
## Meta
<details><summary><code>client.Meta.Hello() -> *cftestapi.HelloMetaResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
client.Meta.Hello(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Notes
<details><summary><code>client.Notes.List() -> *cftestapi.ListNotesResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &cftestapi.ListNotesRequest{}
client.Notes.List(
    context.TODO(),
    request,
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**cursor:** `*string` — Opaque cursor from the previous page's next_cursor
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*int` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notes.Create(request) -> *cftestapi.CreateNotesResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &cftestapi.CreateNotesRequest{
    Body: "body",
}
client.Notes.Create(
    context.TODO(),
    request,
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**body:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notes.Watch() -> cftestapi.WatchNotesResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Each event's SSE id is the note id, so a browser EventSource resumes by itself (Last-Event-ID).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &cftestapi.WatchNotesRequest{}
client.Notes.Watch(
    context.TODO(),
    request,
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**after:** `*string` — Resume after this note id (the id of the last note you received). Absent: only notes created from now on
    
</dd>
</dl>

<dl>
<dd>

**seconds:** `*int` — How long to keep the stream open
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

